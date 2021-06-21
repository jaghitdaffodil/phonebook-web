import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import * as _ from 'lodash';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { environment } from '../../../src/environments/environment';

import { Apollo, gql } from 'apollo-angular';
import { Subscription } from 'rxjs';

const GET_CONTACTS = gql`
query Contacts($limit: Int!, $offset: Int!, $sortBy: String!, $order: String!, $search: String) {
  contacts(limit: $limit, offset: $offset, sortBy: $sortBy, order: $order, search: $search) {
    hasNext,
    data {
      id,
      firstName,
      lastName,
      nickName,
      address
    }
  }
}
`;

@Component({
  selector: 'app-contact-list',
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.css']
})
export class ContactListComponent implements OnInit {
  loading: boolean;
  currentContact: any;
  contactList: Array<any>;
  throttle = 30;
  scrollDistance = 1;
  scrollUpDistance = 1;
  isEditModal = false;
  contactId = null;
  @ViewChild(InfiniteScrollDirective) infiniteScroll: InfiniteScrollDirective;
  baseUrl: string;

  limit: number;
  offset: number;
  sortBy: string;
  order: string;

  search: string;

  hasNext: boolean;

  currentTimestamp: number;

  private querySubscription: Subscription;
  @ViewChild('addProduct') private addProductTemplate: TemplateRef<any>;

  constructor(private modalService: NgbModal, private apollo: Apollo) {
    this.searchContact = _.debounce(this.searchContact, 1000);
  }

  ngOnInit(): void {
    this.baseUrl = environment.baseUrl;

    this.contactList = [];

    this.limit = 5;
    this.offset = 0;
    this.sortBy = 'firstname';
    this.order = 'DESC';

    this.hasNext = false;

    this.getContactList();
  }
  open(content: any, contactId?: any) {
    this.isEditModal = false;
    this.contactId = contactId;
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
    }, (reason) => {
    });
  }

  onScrollDown() {
    // Get API CALL FOR NEXT CONTACTS
    if (!this.hasNext) return;

    this.offset += this.limit;
    this.appendContactList();

    this.infiniteScroll.ngOnDestroy();
    this.infiniteScroll.setup();
  }

  onScrollUp() {
    //DISPLAY PREVIOUS CONTACTS
    // this.infiniteScroll.ngOnDestroy();
    // this.infiniteScroll.setup();
  }
  EditClicked(e: any) {
    this.isEditModal = e.isEditModal;
    this.contactId = e.contactId;
    this.modalService.open(this.addProductTemplate, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
    }, (reason) => {
    });
  }

  searchContact() {
    this.offset = 0;
    this.hasNext = false;

    this.getContactList();
  }

  appendContactList() {

    this.querySubscription = this.apollo.query<any>({
      query: GET_CONTACTS,
      variables: {
        limit: this.limit,
        offset: this.offset,
        sortBy: this.sortBy,
        order: this.order,
        search: this.search
      }
    })
      .subscribe(({ data, loading }) => {
        this.loading = loading;
        this.hasNext = data.contacts.hasNext;

        this.contactList = [...this.contactList, ...data.contacts.data.map((c: any) => {
          return {
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            firstname: c.firstName,
            lastname: c.lastName,
            nickname: c.nickName,
            address: c.address
          };
        })];
      });
  }

  getContactList() {
    this.querySubscription = this.apollo.query<any>({
      query: GET_CONTACTS,
      variables: {
        limit: this.limit,
        offset: this.offset,
        sortBy: this.sortBy,
        order: this.order,
        search: this.search
      }
    })
      .subscribe(({ data, loading }) => {
        this.loading = loading;
        this.hasNext = data.contacts.hasNext;

        this.currentTimestamp = new Date().getTime();

        this.contactList = data.contacts.data.map((c: any) => {
          return {
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            firstname: c.firstName,
            lastname: c.lastName,
            nickname: c.nickName,
            address: c.address
          };
        });
      });
  }

  ngOnDestroy() {
    this.querySubscription && this.querySubscription.unsubscribe();
  }

}
