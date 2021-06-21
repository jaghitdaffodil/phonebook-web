import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ContactListComponent } from '../contact-list/contact-list.component';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

import { Apollo, gql } from 'apollo-angular';
import { Subscription } from 'rxjs';
import { NotificationService } from './../notification.service';

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

const CREATE_CONTACT = gql`
  mutation CreateContact($firstName: String!, $lastName: String!, $nickName: String, $phoneNumbers: [String!]!, $address: String) {
    createContact(contact: {
      firstName: $firstName,
      lastName: $lastName,
      nickName: $nickName,
      phoneNumbers: $phoneNumbers,
      address: $address
    }) {
      id
    }
  }
`;

const UPDATE_CONTACT = gql`
  mutation UpdateContact($id: Int!, $firstName: String!, $lastName: String!, $nickName: String, $phoneNumbers: [String!]!, $address: String) {
    updateContact(contact: {
      id: $id
      firstName: $firstName,
      lastName: $lastName,
      nickName: $nickName,
      phoneNumbers: $phoneNumbers,
      address: $address
    })
  }
`;

@Component({
  selector: 'app-add-contact',
  templateUrl: './add-contact.component.html',
  styleUrls: ['./add-contact.component.css']
})
export class AddContactComponent implements OnInit {
  @ViewChild(ContactListComponent) contactList: ContactListComponent
  addModal: any;
  contactId: number;
  isEditModal: boolean = false;
  addContact: FormGroup = new FormGroup({});
  currentContact: any;
  editContact: FormGroup = new FormGroup({});
  newImageUploaded: boolean;
  baseUrl: string;
  imagePreview: any;
  imageButton: boolean = false;

  @Input()
  set modal(modal: any) {
    this.addModal = modal
  };
  @Input()
  set _isEditModal(_isEditModal: boolean) {
    this.isEditModal = _isEditModal;
  };
  @Input()
  set contact(contact: any) {
    this.contactId = contact;
  };

  @Output() refreshContacts = new EventEmitter<any>();

  private querySubscription: Subscription;
  private mutationSubscription: Subscription;

  constructor(private modalService: NgbModal, private fb: FormBuilder, private http: HttpClient, private apollo: Apollo, private notifyService: NotificationService) { }

  ngOnInit(): void {
    this.baseUrl = environment.baseUrl;
    this.createForm();
    this.isEditModal ? this.getContactDetails() : this.addPhoneNumber();;
  }

  createForm() {
    this.addContact = this.fb.group({
      firstName: [null, [Validators.required, Validators.pattern("^[a-zA-Z]*$")]],
      lastName: [null, [Validators.required, Validators.pattern("^[a-zA-Z]*$")]],
      nickName: [null],
      address: [null],
      photo: [null],
      phoneNumbers: this.fb.array([])
    });
  }

  getContactDetails() {
    this.querySubscription = this.apollo.query<any>({
      query: GET_CONTACT,
      variables: {
        id: this.contactId
      }
    })
      .subscribe(({ data, loading }) => {
        this.currentContact = data.contact;
        this.patchValues();
      });
  }

  patchValues() {
    this.addContact.patchValue({
      firstName: this.currentContact.firstName,
      lastName: this.currentContact.lastName,
      nickName: this.currentContact.nickName,
      address: this.currentContact.address,
      phoneNumbers: []
    })
    this.currentContact.phoneNumbers.map((x: any) => this.phoneNumbers.push(this.fb.control(x.number, [Validators.required, Validators.pattern("^[0-9]*$")])));
    this.imagePreview = this.baseUrl + '/profile-image/' + this.contactId;
  }

  onAddContact() {
    if (this.isEditModal) {
      this.updateContactDetails(this.addContact.value);
    } else {
      this.createNewContact(this.addContact.value);
    }
    this.addModal.close()
  }

  postProfileImage() {
    const formData = new FormData();
    formData.append('file', this.addContact.value.photo);
    formData.append('userId', this.contactId.toString());

    this.http.post(`${environment.baseUrl}/upload`, formData).subscribe((responseData) => { });
  }

  get firstName() { return this.addContact.get('firstName'); }
  get lastName() { return this.addContact.get('lastName'); }
  get phoneNumbers() { return this.addContact.get('phoneNumbers') as FormArray; }

  addPhoneNumber() {
    this.phoneNumbers.push(this.fb.control('', [Validators.required, Validators.pattern("^[0-9]*$")]));
  }

  deletePhoneNumber(index: number) {
    this.phoneNumbers.removeAt(index);
  }
  uploadImage(e: any) {
    let file = e.target.files[0];
    let fileName = file.name;
    let ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    let validFormats = ['png', 'jpeg'];

    if (validFormats.indexOf(ext) == -1) {
      this.notifyService.showError('error', 'File format not supported');
      return;
    }
    this.addContact.patchValue({ 'photo': file });

    this.newImageUploaded = true;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.imagePreview = reader.result;
      this.imageButton = true;
    };
  }

  createNewContact(data: any): void {
    this.mutationSubscription = this.apollo.mutate({
      mutation: CREATE_CONTACT,
      variables: {
        firstName: data.firstName,
        lastName: data.lastName,
        nickName: data.nickName,
        phoneNumbers: data.phoneNumbers,
        address: data.address
      }
    }).subscribe(({ data }: any) => {
      this.contactId = data.createContact && data.createContact.id;

      if (this.contactId && this.newImageUploaded) this.postProfileImage();

      this.notifyService.showSuccess('success', 'Created New Contact');
      this.refreshContacts.emit();
    }, (error) => {
      console.error('createNewContact', error);
      this.notifyService.showError('error', 'Something went wrong');
    });
  }

  updateContactDetails(data: any) {
    this.mutationSubscription = this.apollo.mutate({
      mutation: UPDATE_CONTACT,
      variables: {
        id: this.contactId,
        firstName: data.firstName,
        lastName: data.lastName,
        nickName: data.nickName,
        phoneNumbers: data.phoneNumbers,
        address: data.address
      }
    }).subscribe(({ data }: any) => {
      if (data && !data.updateContact)
        this.notifyService.showError('error', 'Something went wrong');
      else {
        if (this.newImageUploaded) this.postProfileImage();
        this.notifyService.showSuccess('success', 'Updated Contact Details');

        this.refreshContacts.emit();
      }
    }, (error) => {
      console.error('updateContactDetails', error);
      this.notifyService.showError('error', 'Something went wrong');
    });
  }

  ngOnDestroy() {
    this.querySubscription && this.querySubscription.unsubscribe();
    this.mutationSubscription && this.mutationSubscription.unsubscribe();
  }
}
