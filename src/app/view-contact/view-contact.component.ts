import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { environment } from 'src/environments/environment';

import { Apollo, gql } from 'apollo-angular';
import { Subscription } from 'rxjs';
import { NotificationService } from '../notification.service';

const GET_CONTACT = gql`
  query Contact($id: Int!) {
    contact(id: $id) {
      id,
      firstName,
      lastName,
      nickName,
      phoneNumbers {
        number
      },
      address
    }
  }
`;

const DELETE_CONTACT = gql`
  mutation DeleteContact($id: Int!) {
    deleteContact(contact: {
      id: $id
    })
  }
`;

@Component({
  selector: 'app-view-contact',
  templateUrl: './view-contact.component.html',
  styleUrls: ['./view-contact.component.css']
})
export class ViewContactComponent implements OnInit {
  viewModal: any;
  contactId: any;
  viewContact: FormGroup = new FormGroup({});
  baseUrl: string;
  currentContact: any;

  @Input()
  set modal(modal: any) {
    this.viewModal = modal
  };
  @Input()
  set contact(contact: any) {
    this.contactId = contact;
  };

  @Output() refreshContacts1 = new EventEmitter<any>();
  @Output() onEditClicked = new EventEmitter<any>();

  private querySubscription: Subscription;
  private mutationSubscription: Subscription;

  constructor(private modalService: NgbModal, private fb: FormBuilder, private apollo: Apollo, private notifyService: NotificationService) { }

  ngOnInit(): void {
    this.createForm();
    this.baseUrl = environment.baseUrl;

    this.querySubscription = this.apollo.query<any>({
      query: GET_CONTACT,
      variables: {
        id: this.contactId
      }
    })
      .subscribe(({ data }) => {
        this.currentContact = data.contact;
        this.patchValues();
      });
  }
  emitEvent() {
    this.onEditClicked.emit({ contactId: this.contactId, isEditModal: true });
  }

  open(content: any) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
    }, (reason) => {
    });
  }
  createForm() {
    this.viewContact = this.fb.group({
      firstName: [null, Validators.required],
      lastName: [null, Validators.required],
      nickName: [null],
      address: [null],
      photo: [null],
      phoneNumbers: this.fb.array([''], [Validators.required, Validators.pattern("^((\\+91-?)|0)?[0-9]{10}$")])
    });
  }


  patchValues() {
    this.viewContact.patchValue({
      firstName: this.currentContact.firstName,
      lastName: this.currentContact.lastName,
      nickName: this.currentContact.nickName,
      address: this.currentContact.address,
    })
    this.viewContact.setControl('phoneNumbers', this.fb.array(this.currentContact.phoneNumbers.map((x: any) => x.number) || [], [Validators.required, Validators.pattern("^((\\+91-?)|0)?[0-9]{10}$")]));
    this.viewContact.disable();

  }
  get phoneNumbers() { return this.viewContact.get('phoneNumbers') as FormArray; }

  deleteUser() {
    this.mutationSubscription = this.apollo.mutate({
      mutation: DELETE_CONTACT,
      variables: {
        id: this.contactId
      }
    }).subscribe(({ data }: any) => {
      if (data.deleteContact) {
        this.notifyService.showSuccess('success', 'Contact Deleted');

        this.refreshContacts1.emit();
        this.viewModal.close();
      }
      else this.notifyService.showError('error', 'Something went wrong');
    }, (error) => {
      this.notifyService.showError('error', 'Something went wrong');
      console.error('deleteUser', error);
    });
  }

  ngOnDestroy() {
    this.querySubscription && this.querySubscription.unsubscribe();
    this.mutationSubscription && this.mutationSubscription.unsubscribe();
  }
}
